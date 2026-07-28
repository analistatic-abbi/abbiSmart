import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { SupportCenterComponent } from '../../components/support-center/support-center.component';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogosService } from '../../../core/services/catalogos.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent, SupportCenterComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly catalogos = inject(CatalogosService);

  ngOnInit(): void {
    const session = this.auth.session();
    if (session?.paisSesionId && !this.auth.paisNombre()) {
      this.catalogos.getPaises().subscribe({
        next: (r) => {
          const pais = r.data.find(
            (p) => Number(p.id) === Number(session.paisSesionId),
          );
          if (pais) this.auth.setPaisNombre(pais.nombre);
        },
      });
    }
  }
}
