from playwright.sync_api import sync_playwright
import sys
import os

SITE_URL = "http://localhost:3000"

def test_site():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        errors = []
        
        try:
            # === 1. PAGINA INICIAL ===
            print("=" * 50)
            print("1. Acessando a pagina inicial...")
            page.goto(SITE_URL, timeout=30000)
            page.wait_for_load_state('networkidle')
            
            title = page.title()
            print(f"   Titulo: {title}")
            
            # Verifica se elementos principais existem
            body_text = page.text_content('body')
            if 'Luíza' in body_text or 'Luan' in body_text or 'Lu' in body_text:
                print("   [OK] Nomes dos noivos encontrados")
            else:
                errors.append("Nomes dos noivos NAO encontrados na pagina inicial")
                print("   [FAIL] Nomes dos noivos NAO encontrados")
            
            page.screenshot(path='test_home.png', full_page=True)
            print("   [OK] Screenshot salvo: test_home.png")
            
            # === 2. PAGINA DE PRESENTES ===
            print("\n" + "=" * 50)
            print("2. Acessando a pagina de presentes...")
            page.goto(f"{SITE_URL}/presentes.html", timeout=30000)
            page.wait_for_load_state('networkidle')
            
            # Verifica se presentes carregaram
            gift_cards = page.locator('.gift-item')
            gift_count = gift_cards.count()
            print(f"   Presentes encontrados: {gift_count}")
            
            if gift_count > 0:
                print("   [OK] Presentes carregaram corretamente")
            else:
                errors.append("Nenhum presente encontrado na pagina")
                print("   [FAIL] Nenhum presente encontrado!")
            
            # Verifica categorias/filtros
            filters = page.locator('.category-filters button')
            filter_count = filters.count()
            print(f"   Filtros de categoria: {filter_count}")
            
            page.screenshot(path='test_presentes.png', full_page=True)
            print("   [OK] Screenshot salvo: test_presentes.png")
            
            # === 3. SCROLL PERFORMANCE ===
            print("\n" + "=" * 50)
            print("3. Testando scroll da pagina de presentes...")
            
            # Scroll para baixo e para cima
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(500)
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(500)
            print("   [OK] Scroll funcionou sem travar")
            
            # === 4. CLIQUE NO PRESENTE ===
            print("\n" + "=" * 50)
            print("4. Clicando no primeiro presente...")
            
            first_gift = page.locator('[data-gift-id]').first
            if first_gift.count() > 0:
                first_gift.click()
                page.wait_for_timeout(1000)
                
                # Verifica se o modal abriu
                modal = page.locator('.gift-modal, .modal, [class*="modal"], [class*="summary"]')
                if modal.count() > 0:
                    print("   [OK] Modal/resumo do presente abriu")
                    page.screenshot(path='test_modal.png', full_page=True)
                    print("   [OK] Screenshot salvo: test_modal.png")
                    
                    # === 5. CONFIRMAR E IR PRO CHECKOUT ===
                    print("\n" + "=" * 50)
                    print("5. Confirmando presente...")
                    
                    confirm_btn = page.locator('button#summary-confirm, button:has-text("Confirmar"), button:has-text("Presentear")')
                    if confirm_btn.count() > 0:
                        confirm_btn.first.click()
                        page.wait_for_timeout(3000)
                        page.wait_for_load_state('networkidle')
                        
                        current_url = page.url
                        print(f"   URL atual: {current_url}")
                        
                        if 'checkout' in current_url.lower():
                            print("   [OK] Redirecionado para o checkout!")
                            page.screenshot(path='test_checkout.png', full_page=True)
                            print("   [OK] Screenshot salvo: test_checkout.png")
                            
                            # === 6. VERIFICA CHECKOUT ===
                            print("\n" + "=" * 50)
                            print("6. Verificando pagina de checkout...")
                            
                            # Aguarda o brick do Mercado Pago carregar
                            page.wait_for_timeout(5000)
                            
                            gift_name = page.locator('#gift-name')
                            if gift_name.count() > 0:
                                name_text = gift_name.text_content()
                                print(f"   Nome do presente: {name_text}")
                                if name_text and name_text != "Carregando...":
                                    print("   [OK] Dados do presente carregaram")
                                else:
                                    errors.append("Nome do presente nao carregou no checkout")
                                    print("   [FAIL] Nome do presente nao carregou")
                            
                            gift_price = page.locator('#gift-price')
                            if gift_price.count() > 0:
                                price_text = gift_price.text_content()
                                print(f"   Preco: {price_text}")
                                if price_text and 'R$' in price_text and price_text != 'R$ 0,00':
                                    print("   [OK] Preco carregou corretamente")
                                else:
                                    errors.append("Preco nao carregou no checkout")
                                    print("   [FAIL] Preco nao carregou")
                            
                            # Verifica se o botao de pagamento carregou
                            pay_btn = page.locator('#pay-button')
                            btn_text = pay_btn.text_content()
                            
                            if 'Ir para o Pagamento' in btn_text:
                                print("   [OK] Botao de redirecionamento Mercado Pago carregou")
                            else:
                                errors.append("Botao de redirecionamento Mercado Pago NAO carregou ou esta desabilitado")
                                print("   [FAIL] Botao de redirecionamento Mercado Pago NAO carregou")
                            
                            page.screenshot(path='test_checkout_loaded.png', full_page=True)
                            print("   [OK] Screenshot salvo: test_checkout_loaded.png")
                        else:
                            errors.append(f"NAO redirecionou para checkout. URL: {current_url}")
                            print(f"   [FAIL] NAO redirecionou para checkout")
                    else:
                        errors.append("Botao de confirmar nao encontrado no modal")
                        print("   [FAIL] Botao de confirmar nao encontrado")
                else:
                    errors.append("Modal do presente NAO abriu")
                    print("   [FAIL] Modal NAO abriu")
            else:
                errors.append("Nenhum presente clicavel encontrado")
                print("   [FAIL] Nenhum presente clicavel")
            
            # === 7. TESTA VALOR LIVRE ===
            print("\n" + "=" * 50)
            print("7. Testando checkout com valor livre...")
            page.goto(f"{SITE_URL}/checkout.html?giftId=valor-livre&amount=150", timeout=30000)
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(3000)
            
            vl_name = page.locator('#gift-name').text_content() if page.locator('#gift-name').count() > 0 else ""
            vl_price = page.locator('#gift-price').text_content() if page.locator('#gift-price').count() > 0 else ""
            print(f"   Nome: {vl_name}")
            print(f"   Preco: {vl_price}")
            
            if 'Valor Livre' in vl_name:
                print("   [OK] Valor Livre carregou corretamente")
            else:
                errors.append("Valor Livre nao carregou no checkout")
                print("   [FAIL] Valor Livre nao carregou")
            
            if '150' in vl_price:
                print("   [OK] Valor R$150 esta correto")
            else:
                errors.append("Valor R$150 nao apareceu no checkout")
                print("   [FAIL] Valor nao esta correto")
            
            page.screenshot(path='test_valor_livre.png', full_page=True)
            print("   [OK] Screenshot salvo: test_valor_livre.png")
            
        except Exception as e:
            errors.append(f"Erro critico: {e}")
            print(f"\n   [FAIL] ERRO CRITICO: {e}")
            page.screenshot(path='test_error.png', full_page=True)
        finally:
            browser.close()
        
        # === RESULTADO FINAL ===
        print("\n" + "=" * 50)
        print("RESULTADO FINAL")
        print("=" * 50)
        if errors:
            print(f"\n[FAIL] {len(errors)} PROBLEMA(S) ENCONTRADO(S):\n")
            for i, err in enumerate(errors, 1):
                print(f"  {i}. {err}")
            sys.exit(1)
        else:
            print("\n✓ TODOS OS TESTES PASSARAM! Site funcionando corretamente.")
            sys.exit(0)

if __name__ == '__main__':
    test_site()
